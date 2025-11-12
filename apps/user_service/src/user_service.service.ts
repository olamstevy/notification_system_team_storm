/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';
import {
  RegisterUserDto,
  LoginUserDto,
  UpdateUserDto,
  UpdatePreferenceDto,
} from './dto';
import { ApiResponse } from './interfaces/response.interface';

@Injectable()
export class UserServiceService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Register a new user
  async register(dto: RegisterUserDto): Promise<ApiResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user and default preferences
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        push_token: dto.push_token,
        preferences: {
          create: {
            email: true,
            push: true,
          },
        },
      },
      include: {
        preferences: true,
      },
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        access_token: token,
      },
    };
  }

  // Login user
  async login(dto: LoginUserDto): Promise<ApiResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        access_token: token,
      },
    };
  }

  // Get user profile
  async getProfile(userId: string): Promise<ApiResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'User profile retrieved successfully',
      data: userWithoutPassword,
    };
  }

  // Update user profile
  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<ApiResponse> {
    // Check if email is being changed and if it already exists
    if (dto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: {
        preferences: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = updatedUser;

    return {
      success: true,
      message: 'Profile updated successfully',
      data: userWithoutPassword,
    };
  }

  // Get user preferences
  async getPreferences(userId: string): Promise<ApiResponse> {
    const preferences = await this.prisma.user_preference.findUnique({
      where: { user_id: userId },
    });

    if (!preferences) {
      throw new NotFoundException('Preferences not found');
    }

    return {
      success: true,
      message: 'Preferences retrieved successfully',
      data: preferences,
    };
  }

  // Update user preferences
  async updatePreferences(
    userId: string,
    dto: UpdatePreferenceDto,
  ): Promise<ApiResponse> {
    const preferences = await this.prisma.user_preference.upsert({
      where: { user_id: userId },
      update: dto,
      create: {
        user_id: userId,
        ...dto,
      },
    });

    return {
      success: true,
      message: 'Preferences updated successfully',
      data: preferences,
    };
  }

  // Get user by ID (for internal service calls)
  async getUserById(userId: string): Promise<ApiResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'User retrieved successfully',
      data: userWithoutPassword,
    };
  }

  // Get user by email (for internal service calls)
  async getUserByEmail(email: string): Promise<ApiResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'User retrieved successfully',
      data: userWithoutPassword,
    };
  }

  // Health check
  getHealth(): ApiResponse {
    return {
      success: true,
      message: 'User service is healthy',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
