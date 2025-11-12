import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UserServiceService } from './user_service.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  RegisterUserDto,
  LoginUserDto,
  UpdateUserDto,
  UpdatePreferenceDto,
} from './dto';
import type { ApiResponse } from './interfaces/response.interface';

interface AuthenticatedUser {
  user_id: string;
  email: string;
}

@Controller('users')
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  // Health check endpoint
  @Get('health')
  getHealth(): ApiResponse {
    return this.userServiceService.getHealth();
  }

  // Register new user
  @Post('register')
  async register(
    @Body(ValidationPipe) dto: RegisterUserDto,
  ): Promise<ApiResponse> {
    return this.userServiceService.register(dto);
  }

  // Login user
  @Post('login')
  async login(@Body(ValidationPipe) dto: LoginUserDto): Promise<ApiResponse> {
    return this.userServiceService.login(dto);
  }

  // Get current user profile (protected)
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse> {
    return this.userServiceService.getProfile(user.user_id);
  }

  // Update current user profile (protected)
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) dto: UpdateUserDto,
  ): Promise<ApiResponse> {
    return this.userServiceService.updateProfile(user.user_id, dto);
  }

  // Get current user preferences (protected)
  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse> {
    return this.userServiceService.getPreferences(user.user_id);
  }

  // Update current user preferences (protected)
  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) dto: UpdatePreferenceDto,
  ): Promise<ApiResponse> {
    return this.userServiceService.updatePreferences(user.user_id, dto);
  }

  // Get user by ID (for internal service calls)
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<ApiResponse> {
    return this.userServiceService.getUserById(id);
  }

  // Get user by email (for internal service calls)
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<ApiResponse> {
    return this.userServiceService.getUserByEmail(email);
  }
}
